FROM debian:12-slim

RUN apt-get update && apt-get install -y \
    asterisk \
    && rm -rf /var/lib/apt/lists/*

COPY etc/asterisk/ /etc/asterisk/

EXPOSE 5061/udp 5061/tcp 8088/tcp 10000-10100/udp

CMD ["asterisk", "-f", "-vvv"]
