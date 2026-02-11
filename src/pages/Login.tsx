import { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import icon from "@/source bucket/ICON.png";

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
      <Card className="w-full max-w-md shadow-2xl border-border/50 rounded-[2rem] overflow-hidden">
        <CardHeader className="text-center space-y-6 pt-12 pb-8 bg-white">
            <div className="mx-auto">
                 <img 
                  src={icon} 
                  alt="AdminLess Icon" 
                  className="h-28 w-auto object-contain mx-auto" 
                 />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-4xl font-black tracking-tighter text-blue-900">AdminLess</CardTitle>
              <CardDescription className="text-xs font-black text-blue-600 uppercase tracking-[0.3em]">
                  Less Admin. More Teaching.
              </CardDescription>
            </div>
        </CardHeader>
        <CardContent className="p-8">
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
                            borderRadiusButton: '1rem',
                            inputBorderRadius: '1rem',
                        }
                    }
                },
                className: {
                    button: 'w-full px-4 py-4 rounded-2xl font-black transition-all hover:scale-[1.02] active:scale-[0.98]',
                    input: 'flex h-14 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm transition-all focus:ring-2 focus:ring-blue-500/20',
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