import { PageTitle } from '../layout';

// The guard and the 401 path redirect here, so the route exists with its
// real title and nothing else.
export function SignInPage(): React.JSX.Element {
  return (
    <>
      <PageTitle name="Sign in" />
      <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
    </>
  );
}
