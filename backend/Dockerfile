FROM python:3.12-slim

WORKDIR /app

# Dependências de sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

# Dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código-fonte
COPY . .

# Runtime
EXPOSE 8000
ENV PYTHONUNBUFFERED=1

COPY start.sh .
RUN chmod +x start.sh

CMD ["./start.sh"]
