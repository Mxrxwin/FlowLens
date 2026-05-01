package stream

import (
	"context"

	"github.com/redis/go-redis/v9"
)

type Producer struct {
	client *redis.Client
	stream string
}

func NewProducer(client *redis.Client, stream string) *Producer {
	return &Producer{client: client, stream: stream}
}

func (p *Producer) Publish(ctx context.Context, data []byte) error {
	return p.client.XAdd(ctx, &redis.XAddArgs{
		Stream: p.stream,
		Values: map[string]interface{}{"data": data},
	}).Err()
}
