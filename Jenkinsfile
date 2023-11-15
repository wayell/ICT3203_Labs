pipeline {
    agent any
    stages {
        //stage ('Checkout') {
        //    steps {
        //        git branch:'lab9', url: 'https://github.com/wayell/ICT3203_Labs.git'
        //        }
        //    }
        stage('Code Quality Check via SonarQube') {
            steps {
                script {
                    def scannerHome = tool 'SonarQube'; // Name set in Jenkins System Configuration
                    withSonarQubeEnv('SonarQube') {
                        sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectKey=OWASP -Dsonar.sources=." // projectKey name is the SonarQube project name
                        }
                    }
                }
            }
        }
    post {
        always {
            recordIssues enabledForFailure: true, tool: sonarQube()
        }
    }
}