resource "aws_s3_bucket" "media_bucket" {
  bucket = "group-5-mastodon-media-bucket"
  
  tags = {
    Name = "group_5_mastodon_media_bucket"
  }
}

resource "aws_s3_bucket_acl" "media_bucket_acl" {
  bucket = aws_s3_bucket.media_bucket.id
  acl    = "public-read"
}

resource "aws_s3_bucket_public_access_block" "media_bucket_public_access" {
  bucket = aws_s3_bucket.media_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_cors_configuration" "media_cors" {
  bucket = aws_s3_bucket.media_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "media_lifecycle" {
  bucket = aws_s3_bucket.media_bucket.id

  rule {
    id     = "abort-incomplete-multipart-upload"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
