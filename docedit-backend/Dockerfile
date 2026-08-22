FROM node:18-slim

# Install system dependencies, Python, LibreOffice, Java, and required OpenCV runtime libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    libreoffice \
    default-jre \
    fontconfig \
    fonts-dejavu \
    fonts-liberation \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment for Python to avoid PEP 668 restrictions
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Upgrade pip and install pdf2docx (downloads pre-built binary wheels instantly)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir pdf2docx

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]