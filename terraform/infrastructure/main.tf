terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  //get from bootstrap
    backend "s3" {
    bucket = "group-5-bbd-bucket-tf-state"
    key    = "terraform.tfstate"
    region = "af-south-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}


provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# resource "aws_acm_certificate" "main" {
#   provider                   = aws.us_east_1
#   domain_name                = "case-supplier.projects.bbdgrad.com"
#   subject_alternative_names = ["case-supplier-api.projects.bbdgrad.com"]
#   validation_method          = "DNS"

#   lifecycle {
#     create_before_destroy = true
#   }

#   tags = {
#     Name = "case-supplier-certificate"
#   }
# }