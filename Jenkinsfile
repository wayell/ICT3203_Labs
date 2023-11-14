pipeline {
	agent any
	stages {
		// dunnid this part since we clone in
		//stage('Checkout SCM') {
		//	steps {
		//		git '/home/JenkinsDependencyCheckTest'
		//	}
		//}

		stage('OWASP DependencyCheck') {
			steps {
				dependencyCheck additionalArguments: '--format HTML --format XML', odcInstallation: 'Default'
			}
		}
	}	
	post {
		success {
			dependencyCheckPublisher pattern: 'dependency-check-report.xml'
		}
	}
}