output "public_ip" {
  description = "Public IP address of the EC2 app server."
  value       = aws_instance.app.public_ip
}

output "app_url" {
  description = "HTTP URL for the deployed app."
  value       = "http://${aws_instance.app.public_ip}"
}

output "security_group_id" {
  description = "Security group assigned to the EC2 instance."
  value       = aws_security_group.app.id
}
