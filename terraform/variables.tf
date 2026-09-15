variable "aws_region" {
  description = "AWS region used for EC2 deployment."
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Name used for AWS resource tags."
  type        = string
  default     = "empay-hrms"
}

variable "instance_type" {
  description = "EC2 instance type for the application server."
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "Optional custom AMI ID. Leave blank to use the latest Ubuntu 22.04 LTS AMI."
  type        = string
  default     = ""
}

variable "key_name" {
  description = "Existing AWS EC2 key pair name."
  type        = string
}

variable "private_key_path" {
  description = "Local path to the private key matching key_name. Used only for generated Ansible inventory."
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH into the EC2 instance."
  type        = string
}

variable "allowed_http_cidr" {
  description = "CIDR allowed to access the web app."
  type        = string
  default     = "0.0.0.0/0"
}
