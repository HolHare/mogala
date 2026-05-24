FROM debian:12-slim

RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    ca-certificates \
    && curl -fsSL https://packages.asterisk.org/astdeb/pubkey.gpg | gpg --dearmor -o /usr/share/keyrings/asterisk.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/asterisk.gpg] https://packages.asterisk.org/astdeb bookworm main" > /etc/apt/sources.list.d/asterisk.list \
    && apt-get update && apt-get install -y \
    asterisk20 \
    && rm -rf /var/lib/apt/lists/*

COPY etc/asterisk/ /etc/asterisk/

EXPOSE 5061/udp 5061/tcp 8088/tcp 10000-10100/udp

CMD ["asterisk", "-f", "-vvv"]
