import { Button, Container, Section } from "@ams/realtbase-ui";
import Link from "next/link";
import { projectCopy } from "@/project/copy";

export default function NotFound() {
	return (
		<div>
			<Section space="hero">
				<Container size="narrow" className="text-center">
					<p className="text-label font-bold uppercase tracking-wide-role text-action-primary">
						{projectCopy.notFound.code}
					</p>
					<h1 className="mt-4 text-display font-extrabold tracking-display">
						{projectCopy.notFound.title}
					</h1>
					<p className="mx-auto mt-4 max-w-xl text-body-large text-content-default">
						{projectCopy.notFound.body}
					</p>
					<div className="mt-7 flex justify-center gap-3">
						<Button asChild>
							<Link href="/">{projectCopy.notFound.homeLabel}</Link>
						</Button>
						<Button asChild variant="outline">
							<Link href={projectCopy.notFound.catalogHref}>
								{projectCopy.notFound.catalogLabel}
							</Link>
						</Button>
					</div>
				</Container>
			</Section>
		</div>
	);
}
