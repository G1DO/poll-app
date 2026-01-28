output "server_public_ip" {
    description = "Public IP of the poll-app server"
    value       = aws_instance.poll_server.public_ip
}

output "private_key" {
    description = "Private key for SSH access"
    value       = tls_private_key.poll_key.private_key_pem
    sensitive   = true
}
