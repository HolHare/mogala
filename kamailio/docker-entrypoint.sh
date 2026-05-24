#!/bin/bash
set -e

sed -i "s/DBPASS/${MYSQL_PASSWORD}/g" /etc/kamailio/kamailio.cfg.template
cp /etc/kamailio/kamailio.cfg.template /etc/kamailio/kamailio.cfg

exec kamailio -DD -E -f /etc/kamailio/kamailio.cfg
