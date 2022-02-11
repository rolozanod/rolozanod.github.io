FROM python:3.8.8-slim-buster

# Working Directory
WORKDIR /app

# Copy source code to working directory
COPY . /app/

RUN apt-get update &&\
    apt-get install -y wget tar &&\
    pip install --no-cache-dir --upgrade pip &&\
    pip install --no-cache-dir --trusted-host pypi.python.org -r requirements.txt

RUN export HUGOVER=0.92.1 &&\
    wget https://github.com/gohugoio/hugo/releases/download/v${HUGOVER}/hugo_${HUGOVER}_Linux-64bit.deb &&\
    dpkg -i hugo_${HUGOVER}_Linux-64bit.deb

CMD [ "/bin/bash" ]