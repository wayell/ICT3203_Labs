pipeline {
	agent any
	stages {
		// dunnid this part since we clone in locally
		//stage('Checkout SCM') {
		//	steps {
		//		git '/home/JenkinsDependencyCheckTest'
		//	}
		//}

		stage('OWASP DependencyCheck') {
			steps {
				dependencyCheck additionalArguments: '--format HTML --format XML', odcInstallation: 'OWASP Dependency-Check Vulnerabilities'
			}
		}
	}	
	post {
		success {
			dependencyCheckPublisher pattern: 'dependency-check-report.xml'
		}
	}
}