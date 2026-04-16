import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PlannerSettings } from './management/PlannerSettings';
import { RotationBuilder } from './management/RotationBuilder';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

export function PlanningPersoneel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('planning_personeel_tab') || 'planner';
    }
    return 'planner';
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('planning_personeel_tab', value);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/werkrooster')}
          className="text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar Planning
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="tab-pill-list">
          <TabsTrigger value="planner" className="tab-pill-trigger">Planner Instellingen</TabsTrigger>
          <TabsTrigger value="rotatie" className="tab-pill-trigger">Rotatie Schema's</TabsTrigger>
        </TabsList>

        <TabsContent value="planner">
          <PlannerSettings />
        </TabsContent>

        <TabsContent value="rotatie">
          <RotationBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
