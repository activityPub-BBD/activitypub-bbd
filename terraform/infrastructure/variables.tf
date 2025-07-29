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

