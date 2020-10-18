FROM openjdk:8-jre

RUN curl -sL https://deb.nodesource.com/setup_current.x | bash - && \
  curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
  echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
  apt update && \
  apt install -y nodejs yarn

WORKDIR /minecraft-vanilla
ENTRYPOINT ["/usr/bin/yarn", "start"]
