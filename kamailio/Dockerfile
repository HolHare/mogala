FROM debian:12-slim

RUN apt-get update && apt-get install -y \
    kamailio \
    kamailio-mysql-modules \
    kamailio-websocket-modules \
    kamailio-extra-modules \
    kamailio-utils-modules \
    default-mysql-client \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

COPY kamailio.cfg /etc/kamailio/kamailio.cfg.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 5060/udp 5060/tcp 8880/tcp

ENTRYPOINT ["/docker-entrypoint.sh"]
