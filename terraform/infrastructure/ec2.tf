# EC2 Instance
resource "aws_instance" "group_5_mastodon_ec2_instance" {   
  ami                         = "ami-0722f955ef0cb4675"
  instance_type               = "t3.micro"
  key_name                    = "group-5-mastodon-key"
  associate_public_ip_address = true
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_s3_profile.name


  user_data = <<-EOF
      #!/bin/bash
      set -e

      # Update the instance
      sudo yum update -y
      sudo yum install postgresql15

      # Install Node.js 22 from NodeSource
      curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
      sudo yum install -y nodejs gcc-c++ make

      # Install PM2 globally
      sudo npm install -g pm2

      # Install nginx
      sudo yum install -y nginx
      sudo systemctl enable nginx
      sudo systemctl start nginx

      # Install Certbot and nginx plugin
      sudo yum install -y certbot python3-certbot-nginx
    EOF

  tags = {
    Name = "group_5_mastodon_ec2_instance"
  }
}

# Create an Elastic IP
resource "aws_eip" "group_5_mastodon_ec2_eip" {
  instance = aws_instance.group_5_mastodon_ec2_instance.id
  domain   = "vpc"
}

output "ec2_ip" {
  value       = aws_eip.group_5_mastodon_ec2_eip.public_ip
  description = "Public IP of EC2 API server"
}

resource "aws_iam_role" "ec2_s3_role" {
  name = "group-5-mastodon-ec2-s3-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "group_5_mastodon_ec2_s3_role"
  }
}

resource "aws_iam_policy" "ec2_s3_policy" {
  name        = "group-5-mastodon-ec2-s3-policy"
  description = "Policy for EC2 to perform CRUD operations on S3 media bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.media_bucket.arn,
          "${aws_s3_bucket.media_bucket.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_s3_policy_attachment" {
  role       = aws_iam_role.ec2_s3_role.name
  policy_arn = aws_iam_policy.ec2_s3_policy.arn
}

resource "aws_iam_instance_profile" "ec2_s3_profile" {
  name = "group-5-mastodon-ec2-s3-profile"
  role = aws_iam_role.ec2_s3_role.name
}

