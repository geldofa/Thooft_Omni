FROM alpine:latest

ARG PB_VERSION=0.23.12

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    curl

# Download PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# Copy migrations
COPY pb_migrations /pb/pb_migrations

EXPOSE 8090

# Start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
