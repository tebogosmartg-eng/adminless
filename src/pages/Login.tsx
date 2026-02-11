import { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import logo from "@/source bucket/AdminLess logo.png";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-2">
            <div className="mx-auto p-2 rounded-2xl w-fit mb-2">
                 <img src={logo} alt="AdminLess Logo" className="h-16 w-16 object-contain" />
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-blue-900">AdminLess</CardTitle>
            <CardDescription className="text-sm font-bold text-blue-600 uppercase tracking-widest">
                Less Admin. More Teaching.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Auth
            supabaseClient={supabase}
            appearance={{ 
                theme: ThemeSupa,
                variables: {
                    default: {
                        colors: {
                            brand: '#2563eb',
                            brandAccent: '#1d4ed8',
                        },
                        radii: {
                            borderRadiusButton: '0.5rem',
                            inputBorderRadius: '0.5rem',
                        }
                    }
                },
                className: {
                    button: 'w-full px-4 py-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    input: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                }
            }}
            theme="light"
            providers={[]}
            />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;