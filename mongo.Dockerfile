FROM mongo:7-jammy

VOLUME /data/db

EXPOSE 27017

CMD ["mongod", "--bind_ip_all"]
