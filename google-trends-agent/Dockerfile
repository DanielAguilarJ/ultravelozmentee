FROM python:3.11-slim
WORKDIR /app

# Create a non-root user
RUN adduser --disabled-password --gecos "" myuser
USER myuser
ENV PATH="/home/myuser/.local/bin:$PATH"

# Copy the agent folder into the container
COPY --chown=myuser:myuser google_trends/ /app/agents/google_trends/

# Install the python packages
RUN pip install google-auth google-adk

# Set environment variables
ENV GOOGLE_GENAI_USE_VERTEXAI=1

# Expose port
EXPOSE 8080

# Run ADK web server
CMD ["adk", "web", "--port=8080", "--host=0.0.0.0", "/app/agents"]
