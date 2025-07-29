resource "aws_s3_bucket" "group_5_mastodon_s3_bucket_instance" {
  bucket = "group-5-mastodon-s3-cloudfront-distribution-bucket"
  
  tags = {
    Name = "group_5_mastodon_s3_bucket_instance"
  }
}

data "aws_s3_bucket" "selected-bucket" {
  bucket = aws_s3_bucket.group_5_mastodon_s3_bucket_instance.bucket
}

resource "aws_s3_bucket_acl" "bucket-acl" {
  bucket = aws_s3_bucket.group_5_mastodon_s3_bucket_instance.id
  acl    = "private"
}

resource "aws_s3_bucket_versioning" "versioning_example" {
  bucket = data.aws_s3_bucket.selected-bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_website_configuration" "client_website" {
  bucket = aws_s3_bucket.group_5_mastodon_s3_bucket_instance.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "client_bucket_pab" {
  bucket = aws_s3_bucket.group_5_mastodon_s3_bucket_instance.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "group-5-mastodon-s3-oac"
  description                       = "OAC for S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution for Frontend Only
resource "aws_cloudfront_distribution" "frontend" {
  #  aliases = ["group-5-mastodon.projects.bbdgrad.com"]
  # S3 Origin for static website
  origin {
    domain_name              = aws_s3_bucket.group_5_mastodon_s3_bucket_instance.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.group_5_mastodon_s3_bucket_instance.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"


  # Default behavior - serve static files from S3
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.group_5_mastodon_s3_bucket_instance.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600   
    max_ttl                = 86400   
    compress               = true
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
     cloudfront_default_certificate = true
    # Use default certificate for now - add custom domain later
    # acm_certificate_arn = aws_acm_certificate.main.arn
    ssl_support_method  = "sni-only"
  }

  # Custom error pages for SPA routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  tags = {
    Name = "group-5-mastodon-frontend"
  }
}

# S3 bucket policy to allow CloudFront OAC
resource "aws_s3_bucket_policy" "client_bucket_policy" {
  bucket = aws_s3_bucket.group_5_mastodon_s3_bucket_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.group_5_mastodon_s3_bucket_instance.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
  
  depends_on = [aws_cloudfront_distribution.frontend]
}


# Outputs
output "s3_bucket_name" {
  value = aws_s3_bucket.group_5_mastodon_s3_bucket_instance.bucket
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "website_url" {
  value = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}
