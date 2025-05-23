import { useState } from "react";
import GoalForm from "@/components/GoalForm";
import ResultsView from "@/components/ResultsView";
import { CommitmentLevel, Goal, OutputFormat, GeneratedPlan } from "@/lib/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {generatePlanTimeline} from "../lib/gemini"

export default function Home() {
  const [showResults, setShowResults] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();

  const goalMutation = useMutation({
    mutationFn: async (goal: Goal) => {
      const response = await apiRequest("POST", "/api/goals", goal);
      return response.json();
    },
    onSuccess: async (savedGoal) => {
      // Generate the plan with AI
      if(currentGoal) {
        const plan = await generatePlanTimeline(currentGoal);
        if(plan) {
          setGeneratedPlan(plan);
          
          // Save each task to the database
          if (plan.tasks && plan.tasks.length > 0) {
            await Promise.all(plan.tasks.map(async (task) => {
              try {
                // Add the goal ID to each task
                const taskToSave = {
                  ...task,
                  goalId: savedGoal.id,
                  // Convert date object back to string for API
                  dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : undefined
                };
                
                await apiRequest("POST", `/api/goals/${savedGoal.id}/tasks`, taskToSave);
              } catch (error) {
                console.error("Error saving task:", error);
              }
            }));
          }
        }
      }
      setShowResults(true);
    },
    onError: (error) => {
      toast({
        title: "Error generating plan",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleFormSubmit = (goal: Goal) => {
    setCurrentGoal(goal);
    goalMutation.mutate(goal);
  };

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth
    setIsLoggedIn(true);
    toast({
      title: "Connected to Google Calendar",
      description: "You can now export your plan to Google Calendar",
    });
  };

  const handleReset = () => {
    setShowResults(false);
    setCurrentGoal(null);
    setGeneratedPlan(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <header className="text-center mb-8">
        <div className="flex items-center justify-center mb-3">
          <div className="bg-purple-500 rounded-lg p-2 mr-3 text-primary-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
              <path fill-rule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
            </svg>

          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900"><span className="text-purple-500">Palendr</span> AI</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Turn your personal goals into actionable timelines — without overwhelm. 
          AI-powered scheduling that works with your lifestyle.
        </p>
      </header>

      {/* Main Content */}
      <main className="relative">
        {!showResults ? (
          <GoalForm 
            onSubmit={handleFormSubmit} 
            isProcessing={goalMutation.isPending}
            onGoogleSignIn={handleGoogleSignIn}
            isLoggedIn={isLoggedIn}
          />
        ) : (
          generatedPlan && (
            <ResultsView 
              plan={generatedPlan} 
              onReset={handleReset}
              isLoggedIn={isLoggedIn}
            />
          )
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Palendr. All rights reserved.</p>
        <div className="mt-2 flex justify-center space-x-4">
          <a href="#" className="hover:text-gray-700">Terms</a>
          <a href="#" className="hover:text-gray-700">Privacy</a>
          <a href="#" className="hover:text-gray-700">Help</a>
        </div>
      </footer>
    </div>
  );
}
