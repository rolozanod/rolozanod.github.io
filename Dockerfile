FROM python:3.8.8-slim-buster

# Working Directory
WORKDIR /app

# Copy source code to working directory
COPY . /app/

RUN apt-get update &&\
    pip install --no-cache-dir --upgrade pip &&\
    pip install --no-cache-dir --trusted-host pypi.python.org -r requirements.txt

CMD [ "/bin/bash" ]