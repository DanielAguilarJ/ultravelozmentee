import os
import textwrap
import warnings
from datetime import date

import google.auth
from google.adk.agents import LlmAgent
from google.adk.apps import App
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from google.auth.transport.requests import Request

# Suppress experimental ADK credential warnings
warnings.filterwarnings("ignore")

# Auto-detect local .gcloud_config credentials if present
local_adc_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".gcloud_config", "application_default_credentials.json")
if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") and os.path.exists(local_adc_path):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = local_adc_path

def get_agent_instruction(project_id: str) -> str:
    """Generates a clear and formatted prompt for the data analyst."""
    instruction = f"""
    # ROLE
    You are a Google Search Trends Analyst. Your mission is to provide clear answers using SQL data.

    # DATA CONSTRAINTS
    - BigQuery tool `execute_sql` requires explicit billing project mapping. Use: '{project_id}'.
    - Target dataset strictly: `bigquery-public-data.google_trends`

    # SCHEMA DISCOVERY (CRITICAL)
    1. DO NOT call `get_table_info` or `list_table_ids` (Triggers Permission Errors).
    2. Run `SELECT * FROM table LIMIT 0` via `execute_sql` for field definition mapping.

    # OUTPUT PRESENTATION
    - Render purely as a cleanly aligned Markdown table.
    - Use clear and descriptive headers for each column.
    - Remove conversational preambles. Output only the results.
    """
    return textwrap.dedent(instruction).strip()

def get_auth_headers() -> dict[str, str]:
    """Fetch auth headers for the project using Google Cloud Platform scopes."""
    try:
        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        request = Request()
        credentials.refresh(request)
        return {"Authorization": f"Bearer {credentials.token}"}
    except Exception as e:
        warnings.warn(f"Could not load Google Auth credentials: {e}")
        return {"Authorization": "Bearer mock-token-pending-gcloud-auth"}

def get_todays_date() -> str:
    """Returns today's date in YYYY-MM-DD format."""
    return date.today().isoformat()

# --- Application Initialization ---
project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
if not project_id:
    raise ValueError("GOOGLE_CLOUD_PROJECT environment variable is not set")

mcp_headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
} | get_auth_headers()

# Configure BigQuery Tools via MCP
bq_tools = McpToolset(
    connection_params=StreamableHTTPConnectionParams(
        url="https://bigquery.googleapis.com/mcp",
        headers=mcp_headers,
    )
)

# Initialize the LLM Agent
root_agent = LlmAgent(
    name="google_trends",
    model="gemini-3-flash-preview",
    tools=[get_todays_date, bq_tools],
    instruction=get_agent_instruction(project_id),
)

# Create the ADK App
app = App(name=root_agent.name, root_agent=root_agent)
