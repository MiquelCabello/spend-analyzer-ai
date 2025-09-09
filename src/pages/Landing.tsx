import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, ArrowRight, Receipt, PieChart, Users, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  const [selectedPlan, setSelectedPlan] = useState('professional');

  const features = [
    {
      icon: <Receipt className="w-6 h-6" />,
      title: "Análisis AI de Tickets",
      description: "Extracción automática de datos de recibos con Gemini AI"
    },
    {
      icon: <PieChart className="w-6 h-6" />,
      title: "Analíticas Avanzadas",
      description: "Dashboard completo con KPIs y reportes financieros"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Gestión de Empleados",
      description: "Control de roles, aprobaciones y presupuestos por departamento"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Seguridad Empresarial",
      description: "Auditoría completa, RGPD y controles de acceso robustos"
    }
  ];

  const plans = [
    {
      name: "Básico",
      price: "0",
      period: "Gratuito",
      description: "Perfecto para empresas pequeñas que empiezan",
      features: [
        "Hasta 5 empleados",
        "50 gastos por mes",
        "Análisis AI básico",
        "Reportes estándar",
        "Soporte por email"
      ],
      buttonText: "Empezar Gratis",
      popular: false
    },
    {
      name: "Profesional",
      price: "29",
      period: "/mes por empresa",
      description: "La opción más popular para empresas en crecimiento",
      features: [
        "Empleados ilimitados",
        "Gastos ilimitados",
        "Análisis AI avanzado",
        "Reportes personalizados",
        "Exportación de datos",
        "API de integración",
        "Soporte prioritario",
        "Auditoría completa"
      ],
      buttonText: "Empezar Prueba",
      popular: true
    },
    {
      name: "Empresarial",
      price: "89",
      period: "/mes por empresa",
      description: "Para grandes empresas con necesidades avanzadas",
      features: [
        "Todo en Profesional",
        "Integración SSO",
        "Configuración personalizada",
        "Múltiples entidades",
        "Soporte dedicado 24/7",
        "Implementación asistida",
        "Cumplimiento RGPD avanzado",
        "Backup y recuperación"
      ],
      buttonText: "Contactar Ventas",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header */}
      <header className="nav-corporate sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Receipt className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">ExpenseAI</h1>
            </div>
            <Link to="/auth">
              <Button variant="outline" className="mr-2">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-6 px-4 py-2 bg-primary/10 text-primary border-primary/20">
            <Star className="w-4 h-4 mr-2" />
            Potenciado por Inteligencia Artificial
          </Badge>
          
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Gestión de Gastos
            <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              {" "}Empresariales{" "}
            </span>
            Inteligente
          </h2>
          
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Automatiza la captura de recibos, análisis con IA, aprobaciones y reportes financieros. 
            Todo en una plataforma segura y fácil de usar.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="btn-corporate px-8 py-4 text-lg">
                Probar Gratis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
              Ver Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Funcionalidades Principales
            </h3>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar los gastos de tu empresa de forma eficiente y segura
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="card-dashboard hover:shadow-xl transition-all duration-300 animate-slide-in">
                <CardHeader className="text-center pb-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-primary">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-slate-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Planes y Precios
            </h3>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Elige el plan que mejor se adapte al tamaño y necesidades de tu empresa
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.popular ? 'border-primary border-2 shadow-xl scale-105' : 'card-dashboard'} 
                  hover:shadow-2xl transition-all duration-300 animate-fade-in`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-white px-6 py-2 text-sm font-semibold">
                      Más Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center space-x-2">
                    <span className="text-4xl font-bold text-primary">€{plan.price}</span>
                    <span className="text-slate-600">{plan.period}</span>
                  </div>
                  <CardDescription className="text-base mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="w-5 h-5 text-success mr-3 flex-shrink-0" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Link to="/auth" className="w-full">
                    <Button 
                      className={`w-full ${plan.popular ? 'btn-corporate' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.buttonText}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-primary-light text-white">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            ¿Listo para Revolucionar tu Gestión de Gastos?
          </h3>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Únete a más de 1,000 empresas que ya confían en ExpenseAI para gestionar sus gastos empresariales
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="px-8 py-4 text-lg font-semibold">
              Comenzar Ahora - Es Gratis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-900 text-slate-300">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Receipt className="w-6 h-6" />
            <span className="text-xl font-bold text-white">ExpenseAI</span>
          </div>
          <p className="text-sm">
            © 2024 ExpenseAI. Todos los derechos reservados. | 
            <span className="ml-2">Cumplimiento RGPD | Términos de Servicio</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;