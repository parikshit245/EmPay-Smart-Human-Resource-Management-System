pipeline {
  agent any

  environment {
    APP_NAME = 'empay-hrms'
    AWS_REGION = 'eu-north-1'
  }

  parameters {
    booleanParam(name: 'APPLY_INFRA', defaultValue: false, description: 'Create/update AWS EC2 infrastructure with Terraform')
    booleanParam(name: 'DEPLOY_APP', defaultValue: true, description: 'Deploy application to EC2 with Ansible')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Static Checks') {
      steps {
        sh 'npm run lint'
        sh 'npx tsc --noEmit --pretty false'
      }
    }

    stage('Build Application') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t ${APP_NAME}:${BUILD_NUMBER} -t ${APP_NAME}:latest .'
      }
    }

    stage('Terraform Apply') {
      when {
        expression { return params.APPLY_INFRA }
      }
      steps {
        dir('terraform') {
          withCredentials([[
            $class: 'AmazonWebServicesCredentialsBinding',
            credentialsId: 'aws-jenkins-credentials'
          ]]) {
            sh 'terraform init'
            sh 'terraform fmt -check'
            sh 'terraform validate'
            sh 'terraform apply -auto-approve'
          }
        }
      }
    }

    stage('Deploy With Ansible') {
      when {
        expression { return params.DEPLOY_APP }
      }
      steps {
        sshagent(credentials: ['ec2-ssh-key']) {
          sh 'ansible-galaxy collection install -r ansible/requirements.yml'
          sh 'ansible-playbook -i ansible/inventory.ini ansible/deploy.yml'
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'terraform/terraform.tfstate,ansible/inventory.ini', allowEmptyArchive: true
    }
  }
}
