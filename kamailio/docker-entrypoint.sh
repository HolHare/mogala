#!/bin/bash
set -e

sed -i "s/DBPASS/${MYSQL_PASSWORD}/g" /etc/kamailio/kamailio.cfg.template
cp /etc/kamailio/kamailio.cfg.template /etc/kamailio/kamailio.cfg

# Clear stale WS connection IDs from previous run — they're invalid after restart
mysql -h mogala-mysql -u mogala_user -p"${MYSQL_PASSWORD}" mogala \
  -e "DELETE FROM location;" 2>/dev/null || true

exec kamailio -DD -E -f /etc/kamailio/kamailio.cfg
