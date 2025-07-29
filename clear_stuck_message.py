#!/usr/bin/env python3
"""
Script to manually consume and discard stuck messages from RabbitMQ captionsRequest queue
"""
import pika
import json
import os
import sys

def clear_stuck_messages():
    # Get RabbitMQ connection details from environment or use defaults
    rabbitmq_url = os.getenv('AMQP_URL', 'amqp://localhost:5672')
    
    try:
        # Connect to RabbitMQ
        connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_url))
        channel = connection.channel()
        
        # Declare the queue (same as your Go service)
        queue_name = 'captionsRequest'
        channel.queue_declare(queue=queue_name, durable=True)
        
        print(f"Connected to RabbitMQ. Checking queue: {queue_name}")
        
        # Get queue info
        method_frame, header_frame, body = channel.basic_get(queue=queue_name, auto_ack=False)
        
        message_count = 0
        while method_frame:
            message_count += 1
            
            # Parse the message
            try:
                message_data = json.loads(body)
                video_id = message_data.get('VideoId', 'unknown')
                s3_key = message_data.get('S3Key', 'unknown')
                
                print(f"Message {message_count}:")
                print(f"  VideoId: {video_id}")
                print(f"  S3Key: {s3_key}")
                print(f"  Body: {body.decode('utf-8')}")
                
                # Ask user what to do with this message
                action = input("Action: (a)ck to delete, (r)eject to requeue, (s)kip to next: ").lower()
                
                if action == 'a':
                    channel.basic_ack(delivery_tag=method_frame.delivery_tag)
                    print("✅ Message acknowledged (deleted)")
                elif action == 'r':
                    channel.basic_nack(delivery_tag=method_frame.delivery_tag, requeue=True)
                    print("🔄 Message rejected (requeued)")
                else:
                    channel.basic_nack(delivery_tag=method_frame.delivery_tag, requeue=True)
                    print("⏭️  Message skipped (requeued)")
                    
            except json.JSONDecodeError:
                print(f"⚠️  Invalid JSON message: {body}")
                channel.basic_ack(delivery_tag=method_frame.delivery_tag)  # Delete invalid messages
                
            # Get next message
            method_frame, header_frame, body = channel.basic_get(queue=queue_name, auto_ack=False)
        
        if message_count == 0:
            print("✅ No messages found in queue")
        else:
            print(f"Processed {message_count} messages")
            
        connection.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("RabbitMQ Message Queue Cleaner")
    print("==============================")
    clear_stuck_messages() 