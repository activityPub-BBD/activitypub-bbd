# EC2 Instance
resource "aws_instance" "group_5_mastodon_ec2_instance" {   
  ami                         = "ami-0722f955ef0cb4675"
  instance_type               = "t3.micro"
  key_name                    = "group-5-mastodon-key"
  associate_public_ip_address = true
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]


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

