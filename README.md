# EmPay Smart Human Resource Management System

EmPay is a Next.js based HRMS application with employee management, attendance, leave, payroll, reports, role-based authentication, face enrollment, and AI chat support.

This repository also contains a complete DevOps assessment setup demonstrating:

- Docker and Docker Compose containerization
- Terraform Infrastructure as Code for AWS EC2
- Ansible server provisioning and application deployment
- Jenkins CI/CD pipeline
- Production-style deployment on AWS EC2

## Architecture

```text
Developer/Jenkins
  -> Terraform creates AWS EC2 + security group
  -> Ansible installs Docker and deploys the app
  -> Docker Compose runs Nginx + Next.js app + PostgreSQL
  -> User accesses http://EC2_PUBLIC_IP
```

## Tech Stack

- Frontend and backend: Next.js 14, React, TypeScript
- Database ORM: Prisma
- Database: PostgreSQL
- Container runtime: Docker
- Reverse proxy: Nginx
- IaC: Terraform
- Provisioning: Ansible
- CI/CD: Jenkins
- Cloud: AWS EC2

## Local Docker Run

1. Create the environment file:

```bash
cp .env.production.example .env
```

2. Update secrets in `.env`, especially `JWT_SECRET` and `POSTGRES_PASSWORD`.

3. Start the full stack:

```bash
docker compose up --build -d
```

4. Open the application:

```text
http://localhost
```

The app health endpoint is available at:

```text
http://localhost/api/health
```

## Terraform AWS Infrastructure

Terraform creates:

- EC2 instance
- Security group for SSH, HTTP, and demo access on port 3000
- Generated Ansible inventory file

Steps:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
key_name         = "your-existing-ec2-keypair-name"
private_key_path = "~/.ssh/your-key.pem"
allowed_ssh_cidr = "YOUR_PUBLIC_IP/32"
```

Run:

```bash
terraform init
terraform fmt
terraform validate
terraform apply
```

After apply, Terraform writes:

```text
ansible/inventory.ini
```

## Ansible Provisioning And Deployment

Ansible installs Docker, clones the repository on EC2, creates the production `.env`, and starts the containers.

Prepare variables:

```bash
cp ansible/group_vars/app.yml.example ansible/group_vars/app.yml
```

Edit `ansible/group_vars/app.yml` and set:

- `repo_url`
- `jwt_secret`
- `postgres_password`
- `groq_api_key` if AI chat is needed

Install required Ansible collection:

```bash
ansible-galaxy collection install -r ansible/requirements.yml
```

Deploy:

```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
```

Open:

```text
http://EC2_PUBLIC_IP
```

## Jenkins CI/CD

The `Jenkinsfile` includes these stages:

1. Checkout
2. Install dependencies
3. Lint and TypeScript checks
4. Build Next.js application
5. Build Docker image
6. Optional Terraform apply
7. Ansible deployment

Required Jenkins tools/plugins:

- Node.js 20
- Docker
- Terraform
- Ansible
- AWS Credentials plugin
- SSH Agent plugin

Required Jenkins credentials:

- `aws-jenkins-credentials`: AWS access key/secret with EC2 permissions
- `ec2-ssh-key`: SSH private key for the EC2 key pair

Pipeline parameters:

- `APPLY_INFRA`: creates or updates AWS infrastructure with Terraform
- `DEPLOY_APP`: deploys the app with Ansible

## Important Files

```text
Dockerfile                         Production image for the Next.js app
docker-compose.yml                 Nginx, app, and PostgreSQL services
nginx.conf                         Reverse proxy config
docker-entrypoint.sh               Runs Prisma migrations before app start
terraform/main.tf                  AWS EC2 and security group
terraform/variables.tf             IaC inputs
terraform/outputs.tf               EC2 IP and app URL outputs
ansible/deploy.yml                 Server provisioning and app deployment
Jenkinsfile                        CI/CD pipeline
app/api/health/route.ts            Deployment health endpoint
```

## Production Notes

- Keep `.env`, `terraform.tfvars`, and generated inventory files out of Git.
- Restrict `allowed_ssh_cidr` to your own public IP.
- Rotate `JWT_SECRET`, database password, and API keys before real production use.
- Use AWS RDS for a stronger production database setup if the assessment allows managed services.
