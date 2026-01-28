terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {                        
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_vpc" "poll_vpc" {
    cidr_block = "10.0.0.0/16"
    tags = {
        Name = "poll-app-vpc"
    }
}

resource "aws_subnet" "poll_subnet" {
    vpc_id                  = aws_vpc.poll_vpc.id
    cidr_block              = "10.0.1.0/24"    
    map_public_ip_on_launch = true
    tags = {
        Name = "poll-app-subnet"
    }
}

resource "aws_internet_gateway" "poll_igw"{
    vpc_id = aws_vpc.poll_vpc.id
    tags = {
        Name = "poll-aws_internet_gateway"
    }
}
resource "aws_route_table" "poll_rt" {
    vpc_id = aws_vpc.poll_vpc.id
    
    route {
        cidr_block = "0.0.0.0/0"        # "all traffic"
        gateway_id = aws_internet_gateway.poll_igw.id     # reference to your internet gateway
    }
    
    tags = {
        Name = "poll-app-rt"
    }
}

resource "aws_route_table_association" "poll_rta" {
    subnet_id      = aws_subnet.poll_subnet.id   # reference to your subnet
    route_table_id = aws_route_table.poll_rt.id    # reference to the route table above
}

resource "aws_security_group" "poll_sg" {
    name        = "poll-app-sg"
    description = "Security group for poll-app"
    vpc_id      = aws_vpc.poll_vpc.id
    
    # SSH access
    ingress {
        from_port   = 22
        to_port     = 22
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }
    ingress{
        from_port =30080 
        to_port = 30080 
        protocol ="tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }
    ingress{
        from_port =30090  
        to_port = 30090  
        protocol ="tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }
    ingress{
        from_port =30030   
        to_port = 30030   
        protocol ="tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }
    ingress{
        from_port =6443   
        to_port = 6443   
        protocol ="tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }
    
    # Allow all outbound traffic
    egress {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }
    
    tags = {
        Name = "poll-app-sg"
    }
}
# Generate a new SSH key
resource "tls_private_key" "poll_key" {
    algorithm = "RSA"
    rsa_bits  = 4096
}

# Upload the public key to AWS
resource "aws_key_pair" "poll_keypair" {
    key_name   = "poll-app-key"
    public_key = tls_private_key.poll_key.public_key_openssh
}



resource "aws_instance" "poll_server" {
    ami                    = "ami-0c7217cdde317cfec"  # Ubuntu 22.04 in us-east-1
    instance_type          = var.my_instance_type
    subnet_id              = aws_subnet.poll_subnet.id
    vpc_security_group_ids = [aws_security_group.poll_sg.id]
    key_name               = aws_key_pair.poll_keypair.key_name   # ← add this

    user_data = <<-EOF
        #!/bin/bash
        curl -sfL https://get.k3s.io | sh -
    EOF
    
    tags = {
        Name = "poll-app-server"
    }
}
