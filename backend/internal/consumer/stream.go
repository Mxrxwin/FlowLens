package consumer

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type Handler interface {
	HandleEvent(ctx context.Context, raw []byte) error
}

type Consumer struct {
	client  *redis.Client
	stream  string
	handler Handler
}

func New(client *redis.Client, stream string, handler Handler) *Consumer {
	return &Consumer{client: client, stream: stream, handler: handler}
}

func (c *Consumer) Run(ctx context.Context) error {
	lastID := "$"

	for {
		if err := ctx.Err(); err != nil {
			return err
		}

		res, err := c.client.XRead(ctx, &redis.XReadArgs{
			Streams: []string{c.stream, lastID},
			Block:   0,
		}).Result()
		if err != nil {
			if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
				return err
			}
			log.Printf("xread: %v", err)
			time.Sleep(time.Second)
			continue
		}

	ProcessLoop:
		for _, s := range res {
			for _, msg := range s.Messages {
				data, ok := msg.Values["data"].(string)
				if !ok || data == "" {
					log.Printf("skip %s: empty data", msg.ID)
					lastID = msg.ID
					continue
				}
				if err := c.handler.HandleEvent(ctx, []byte(data)); err != nil {
					log.Printf("handle %s: %v", msg.ID, err)
					select {
					case <-time.After(500 * time.Millisecond):
					case <-ctx.Done():
						return ctx.Err()
					}
					break ProcessLoop
				}
				lastID = msg.ID
			}
		}
	}
}
