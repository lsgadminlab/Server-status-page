pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    IMAGE_NAME      = 'mc-status-webiste'                 // image repo name
    IMAGE_TAG       = "${env.BUILD_NUMBER}"           // or use GIT_COMMIT
    REGISTRY_URL    = '10.111.54.64'          // no https://
    DOCKER_CREDS_ID = 'registry-auth'         // Jenkins credentialsId (username/password)
    // ----------------------
    FULL_IMAGE = "${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG}"
    LATEST_IMAGE = "${REGISTRY_URL}/${IMAGE_NAME}:latest"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Docker Image') {
      steps {
        sh '''
          set -eux
          docker build -t "${FULL_IMAGE}" -t "${LATEST_IMAGE}" .
        '''
      }
    }

    stage('Push Docker Image') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: "${DOCKER_CREDS_ID}",
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh '''
            set -eux
            echo "${DOCKER_PASS}" | docker login "${REGISTRY_URL}" -u "${DOCKER_USER}" --password-stdin
            docker push "${FULL_IMAGE}"
            docker push "${LATEST_IMAGE}"
            docker logout "${REGISTRY_URL}"
          '''
        }
      }
    }
  }

  post {
    success {
      echo "Pushed: ${FULL_IMAGE}"
      echo "Pushed: ${LATEST_IMAGE}"
    }
    always {
      sh '''
        docker image rm "${FULL_IMAGE}" || true
        docker image rm "${LATEST_IMAGE}" || true
      '''
    }
  }
}
