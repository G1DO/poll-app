terraform {
  required_providers {
    aws = {
        source  = "hashicorp/aws"
        version = "~> 5.0" # Standard version for 2026 stability

    }
  }
}
provider "aws" {
  region = var.aws_region
}