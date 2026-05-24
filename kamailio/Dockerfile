FROM debian:12-slim

RUN apt-get update && apt-get install -y \
    kamailio \
    kamailio-mysql-modules \
    kamailio-tls-modules \
    kamailio-websocket-modules \
    kamailio-extra-modules \
    kamailio-utils-modules \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

COPY kamailio.cfg /etc/kamailio/kamailio.cfg

EXPOSE 5060/udp 5060/tcp 5061/tcp 8080/tcp

CMD ["kamailio", "-DD", "-E", "-f", "/etc/kamailio/kamailio.cfg"]
