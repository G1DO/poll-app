variable "my_instance_type" {
  description = "The AWS EC2 instance type"
  type        = string
  default     = "t3.micro"
}
variable "aws_region" {
  description = "The AWS EC2 region"
  type        = string
  default     = "us-east-1"
}
