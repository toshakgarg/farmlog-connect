import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/farmer')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/farmer"!</div>
}
