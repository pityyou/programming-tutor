FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    nodejs npm \
    openjdk-17-jdk \
    g++ gcc \
    golang-go \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m sandbox -s /bin/bash
USER sandbox
WORKDIR /code

ENTRYPOINT ["/bin/bash", "-c"]
