FROM ubuntu:24.04
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 libgcc-s1 && rm -rf /var/lib/apt/lists/*
RUN ! command -v node && ! test -e /usr/bin/node && ! test -e /usr/local/bin/node
