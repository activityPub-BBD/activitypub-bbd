variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default = "af-south-1"
}

variable "db_username" {
    default = "/db_config/db_username"
}

variable "db_password" {
    default = "/db_config/db_password"
}

variable "api_domain_name" {
  description = "Domain name for the API Gateway"
  type        = string
  default     = "mastodon.thups.co.za"
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for API Gateway custom domain"
  type        = string
  default     = "arn:aws:acm:af-south-1:574836245203:certificate/90feefed-6aab-4120-b218-d5bb26f95fc7"
}

