FROM debian:12-slim AS builder

RUN apt-get update && apt-get install -y \
    build-essential \
    wget \
    libjansson-dev \
    libxml2-dev \
    libsqlite3-dev \
    uuid-dev \
    libssl-dev \
    libncurses5-dev \
    libedit-dev \
    libsrtp2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp
RUN wget -q http://downloads.asterisk.org/pub/telephony/asterisk/asterisk-20-current.tar.gz \
    && tar xzf asterisk-20-current.tar.gz \
    && cd asterisk-20* \
    && ./configure --with-jansson-bundled --without-pjproject-bundled \
    && make menuselect.makeopts \
    && menuselect/menuselect \
        --enable chan_sip \
        --enable res_srtp \
        menuselect.makeopts \
    && make -j$(nproc) \
    && make install \
    && make samples

FROM debian:12-slim

RUN apt-get update && apt-get install -y \
    libjansson4 \
    libxml2 \
    libsqlite3-0 \
    libuuid1 \
    libssl3 \
    libedit2 \
    libsrtp2-1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/sbin/asterisk /usr/sbin/asterisk
COPY --from=builder /usr/lib/asterisk /usr/lib/asterisk
COPY --from=builder /var/lib/asterisk /var/lib/asterisk
COPY --from=builder /var/spool/asterisk /var/spool/asterisk
COPY --from=builder /etc/asterisk /etc/asterisk

COPY etc/asterisk/ /etc/asterisk/

EXPOSE 5061/udp 5061/tcp 8088/tcp 10000-10100/udp

CMD ["asterisk", "-f", "-vvv"]
