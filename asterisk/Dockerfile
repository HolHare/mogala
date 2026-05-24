FROM andrius/asterisk:20

COPY etc/asterisk/ /etc/asterisk/

EXPOSE 5061/udp 5061/tcp 8088/tcp 10000-10100/udp

CMD ["asterisk", "-f", "-vvv"]
