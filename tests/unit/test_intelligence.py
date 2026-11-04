"""
SENTRIX — Meta Muse Spark Open Intelligence Provider Unit Tests
Tests bounded retries, HTTP error handling (401, 403, 429, 500, 503), timeouts,
network failures, schema validation, asset verification, and provenance guarantees.
"""
import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock
import httpx

from sentrix.intelligence.provider import (
    ModelInferenceProvider,
    MuseAnalysisPayload,
    MuseExplanationPayload,
    verify_assets_against_graph
)
from sentrix.models.schemas import Incident, IntelligenceAnalysisResponse


@pytest.fixture
def sample_incident() -> Incident:
    return Incident(
        id="scenario-flood-central-2026",
        title="Urban Flash Inundation",
        category="URBAN_FLASH_FLOOD",
        severity="CRITICAL",
        epicenter=(40.715, -74.009),
        radius_meters=1200.0,
        flood_depth_cm=65.0,
        progression_rate_cm_per_hour=14.0,
        description="Flash flood over Grand Ave Underpass",
        evidence=[]
    )


@pytest.fixture
def mock_provider() -> ModelInferenceProvider:
    provider = ModelInferenceProvider()
    provider.api_key = "test_baseten_key_xyz"
    provider.base_url = "https://mock.baseten.co/v1"
    return provider


# --- 1. Asset Verification Tests ---

def test_verify_assets_against_graph():
    """Verify that graph asset matching distinguishes valid assets from hallucinations."""
    raw_refs = [
        "hospital-st-jude",                   # Valid exact ID
        "St. Jude Level-1 Trauma Center",     # Valid exact name
        "Substation North-01",                # Valid partial name
        "Random Imaginary Power Station",     # Hallucination / unverified
        "substation-west-02"                  # Valid exact ID
    ]
    verified, unverified = verify_assets_against_graph(raw_refs)

    assert "hospital-st-jude" in verified
    assert "substation-north-01" in verified
    assert "substation-west-02" in verified
    assert "Random Imaginary Power Station" in unverified
    assert "Random Imaginary Power Station" not in verified


# --- 2. Live Model Output & Schema Tests ---

@pytest.mark.asyncio
async def test_live_model_success_with_asset_filtering(sample_incident, mock_provider):
    """Verify successful live model analysis with asset filtering and true confidence score."""
    mock_payload = {
        "assessed_category": "URBAN_FLASH_FLOOD",
        "severity_assessment": "CRITICAL",
        "visible_hazards": ["Substation yard inundated", "Ambulance artery blocked"],
        "potentially_affected_assets": [
            "hospital-st-jude",
            "Substation North-01 Grid",
            "Hallucinated Dam 99"
        ],
        "risk_hypotheses": ["Generator failure will cause ICU power interruption"],
        "plausible_cascades": ["Flood -> Substation Trip -> Hospital Backup -> Fuel Exhaustion"],
        "uncertainty_indicators": ["Storm surge crest timing unknown"],
        "missing_information": ["Auxiliary fuel level at trauma center"],
        "operational_rationale": "Multimodal visual and telemetry assessment matches 10m DEM elevation model.",
        "confidence_score": 0.95
    }

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(mock_payload),
                    "reasoning_content": "Internal chain of thought that MUST BE DISCARDED"
                }
            }
        ]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        res = await mock_provider.analyze_incident(sample_incident)

        assert res.model_provenance == "LIVE_META_MUSE_SPARK_OPEN"
        assert res.confidence_score == 0.95
        assert res.severity_assessment == "CRITICAL"
        assert "hospital-st-jude" in res.potentially_affected_assets
        assert "substation-north-01" in res.potentially_affected_assets
        assert "Hallucinated Dam 99" not in res.potentially_affected_assets
        assert res.diagnostic_metadata is not None
        assert "Hallucinated Dam 99" in res.diagnostic_metadata["unverified_model_assets"]


@pytest.mark.asyncio
async def test_live_model_preserves_empty_lists_without_fabrication(sample_incident, mock_provider):
    """Verify that if live model returns empty lists, code preserves them rather than injecting fallbacks."""
    mock_payload = {
        "assessed_category": "URBAN_FLASH_FLOOD",
        "severity_assessment": "MODERATE",
        "visible_hazards": [],
        "potentially_affected_assets": [],
        "risk_hypotheses": [],
        "plausible_cascades": [],
        "uncertainty_indicators": [],
        "missing_information": [],
        "operational_rationale": "Sparse initial reporting.",
        "confidence_score": 0.60
    }

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": json.dumps(mock_payload)}}]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        res = await mock_provider.analyze_incident(sample_incident)

        assert res.model_provenance == "LIVE_META_MUSE_SPARK_OPEN"
        assert res.visible_hazards == []
        assert res.potentially_affected_assets == []
        assert res.risk_hypotheses == []
        assert res.confidence_score == 0.60


@pytest.mark.asyncio
async def test_live_model_null_confidence_preserved(sample_incident, mock_provider):
    """Verify that if live model omits confidence_score, it remains null/None."""
    mock_payload = {
        "assessed_category": "URBAN_FLASH_FLOOD",
        "severity_assessment": "HIGH",
        "visible_hazards": ["Corridor blocked"],
        "potentially_affected_assets": ["hospital-st-jude"],
        "risk_hypotheses": ["Access delay"],
        "plausible_cascades": ["Delay -> Compromised Care"],
        "uncertainty_indicators": [],
        "missing_information": [],
        "operational_rationale": "High-confidence geometric analysis."
        # confidence_score omitted
    }

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": json.dumps(mock_payload)}}]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        res = await mock_provider.analyze_incident(sample_incident)

        assert res.model_provenance == "LIVE_META_MUSE_SPARK_OPEN"
        assert res.confidence_score is None


# --- 3. HTTP Error & Non-Retryable Failure Tests ---

@pytest.mark.asyncio
async def test_http_401_fails_fast_without_retries(sample_incident, mock_provider):
    """Verify HTTP 401 Unauthorized fails immediately on first attempt and uses fallback."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 401

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        res = await mock_provider.analyze_incident(sample_incident)

        # Must not retry: call count must be exactly 1
        assert mock_post.call_count == 1
        assert res.model_provenance == "VERIFIED_DETERMINISTIC_ENGINE"
        assert res.confidence_score is None
        assert res.diagnostic_metadata["failure_category"] == "AUTHENTICATION_FAILED"


@pytest.mark.asyncio
async def test_http_403_fails_fast_without_retries(sample_incident, mock_provider):
    """Verify HTTP 403 Forbidden fails immediately on first attempt."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 403

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        res = await mock_provider.analyze_incident(sample_incident)

        assert mock_post.call_count == 1
        assert res.model_provenance == "VERIFIED_DETERMINISTIC_ENGINE"
        assert res.confidence_score is None
        assert res.diagnostic_metadata["failure_category"] == "AUTHENTICATION_FAILED"


# --- 4. Retryable HTTP Error Tests (429, 503) ---

@pytest.mark.asyncio
async def test_http_429_rate_limit_bounded_retries(sample_incident, mock_provider):
    """Verify HTTP 429 performs bounded retries (max_retries + 1 = 3 calls) then falls back."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 429

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, \
         patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        mock_post.return_value = mock_response

        res = await mock_provider.analyze_incident(sample_incident)

        assert mock_post.call_count == mock_provider.max_retries + 1
        assert mock_sleep.call_count == mock_provider.max_retries
        assert res.model_provenance == "VERIFIED_DETERMINISTIC_ENGINE"
        assert res.confidence_score is None
        assert res.diagnostic_metadata["failure_category"] == "RATE_LIMIT_EXCEEDED"


@pytest.mark.asyncio
async def test_http_503_upstream_unavailable_retries(sample_incident, mock_provider):
    """Verify HTTP 503 performs bounded retries then falls back."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 503

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, \
         patch("asyncio.sleep", new_callable=AsyncMock):
        mock_post.return_value = mock_response

        res = await mock_provider.analyze_incident(sample_incident)

        assert mock_post.call_count == mock_provider.max_retries + 1
        assert res.model_provenance == "VERIFIED_DETERMINISTIC_ENGINE"
        assert res.diagnostic_metadata["failure_category"] == "UPSTREAM_UNAVAILABLE"


@pytest.mark.asyncio
async def test_http_500_server_error(sample_incident, mock_provider):
    """Verify HTTP 500 routes to deterministic fallback with UPSTREAM_SERVER_ERROR."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 500

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, \
         patch("asyncio.sleep", new_callable=AsyncMock):
        mock_post.return_value = mock_response

        res = await mock_provider.analyze_incident(sample_incident)

        assert res.model_provenance == "VERIFIED_DETERMINISTIC_ENGINE"
        assert res.diagnostic_metadata["failure_category"] == "UPSTREAM_SERVER_ERROR"


# --- 5. Network & Timeout Tests ---

@pytest.mark.asyncio
async def test_request_timeout_routes_to_fallback(sample_incident, mock_provider):
    """Verify that httpx.ReadTimeout performs bounded retries and falls back cleanly."""
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, \
         patch("asyncio.sleep", new_callable=AsyncMock):
        mock_post.side_effect = httpx.ReadTimeout("Read timed out after 25s")

        res = await mock_provider.analyze_incident(sample_incident)

        assert mock_post.call_count == mock_provider.max_retries + 1
        assert res.model_provenance == "VERIFIED_DETERMINISTIC_ENGINE"
        assert res.confidence_score is None
        assert res.diagnostic_metadata["failure_category"] == "REQUEST_TIMEOUT"


@pytest.mark.asyncio
async def test_connection_error_routes_to_fallback(sample_incident, mock_provider):
    """Verify that network connection reset or failure falls back cleanly."""
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, \
         patch("asyncio.sleep", new_callable=AsyncMock):
        mock_post.side_effect = httpx.ConnectError("Connection refused by endpoint")

        res = await mock_provider.analyze_incident(sample_incident)

        assert mock_post.call_count == mock_provider.max_retries + 1
        assert res.model_provenance == "VERIFIED_DETERMINISTIC_ENGINE"
        assert res.confidence_score is None
        assert res.diagnostic_metadata["failure_category"] == "CONNECTION_ERROR"


# --- 6. Malformed JSON & Schema Failure Tests ---

@pytest.mark.asyncio
async def test_malformed_json_routes_to_fallback(sample_incident, mock_provider):
    """Verify that invalid/truncated JSON content routes to fallback with MALFORMED_JSON."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "{\"broken_json\": invalid_value..."}}]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        res = await mock_provider.analyze_incident(sample_incident)

        assert res.model_provenance == "VERIFIED_DETERMINISTIC_ENGINE"
        assert res.confidence_score is None
        assert res.diagnostic_metadata["failure_category"] == "MALFORMED_JSON"


@pytest.mark.asyncio
async def test_schema_validation_failure_routes_to_fallback(sample_incident, mock_provider):
    """Verify that JSON missing required fields routes to fallback with SCHEMA_VALIDATION_ERROR."""
    # Missing required operational_rationale/reasoning_summary and invalid severity
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps({
                        "assessed_category": "URBAN_FLASH_FLOOD",
                        "severity_assessment": "NON_STANDARD_SEVERITY_XYZ",
                        "visible_hazards": ["Test"]
                    })
                }
            }
        ]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        res = await mock_provider.analyze_incident(sample_incident)

        assert res.model_provenance == "VERIFIED_DETERMINISTIC_ENGINE"
        assert res.confidence_score is None
        assert res.diagnostic_metadata["failure_category"] == "SCHEMA_VALIDATION_ERROR"
