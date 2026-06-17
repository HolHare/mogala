FROM adminer:latest
RUN mkdir -p /usr/local/etc/php/conf.d && \
    echo "mysqlnd.get_server_public_key=on" > /usr/local/etc/php/conf.d/mysql-public-key.ini
