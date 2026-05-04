FROM golang:1.23-alpine AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /out/server ./cmd

FROM alpine:3.19
COPY --from=build /out/server /usr/local/bin/server
CMD ["server"]