pipeline {
  agent any

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    // Change if your Jenkins uses different tool names
    NODEJS_TOOL = 'node-20'
    MAVEN_TOOL  = 'maven-3.9'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Web') {
      steps {
        script {
          def nodeHome = tool(name: env.NODEJS_TOOL, type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation')
          withEnv(["PATH+NODE=${nodeHome}/bin"]) {
            sh '''
              set -eux
              npm ci || npm install
            '''
          }
        }
      }
    }

    stage('Build Paper Plugin') {
      steps {
        script {
          def mvnHome = tool(name: env.MAVEN_TOOL, type: 'hudson.tasks.Maven$MavenInstallation')
          withEnv(["PATH+MAVEN=${mvnHome}/bin"]) {
            sh '''
              set -eux
              cd paper-plugin
              mvn -B -U clean package
            '''
          }
        }
      }
    }

    stage('Build Velocity Plugin') {
      steps {
        script {
          def mvnHome = tool(name: env.MAVEN_TOOL, type: 'hudson.tasks.Maven$MavenInstallation')
          withEnv(["PATH+MAVEN=${mvnHome}/bin"]) {
            sh '''
              set -eux
              cd velocity-plugin
              mvn -B -U clean package
            '''
          }
        }
      }
    }

    stage('Collect Artifacts') {
      steps {
        sh '''
          set -eux
          mkdir -p artifacts

          # web files
          cp package.json artifacts/ || true
          cp server.js artifacts/ || true
          cp Dockerfile artifacts/ || true

          # plugin jars
          cp paper-plugin/target/*.jar artifacts/ || true
          cp velocity-plugin/target/*.jar artifacts/ || true
        '''
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'artifacts/**', fingerprint: true
    }
    success {
      echo 'Build completed successfully.'
    }
    failure {
      echo 'Build failed. Check stage logs.'
    }
  }
}
